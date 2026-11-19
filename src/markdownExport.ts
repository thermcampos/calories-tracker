import { getInputById } from "./utils/domUtils";
import { FoodItem, FoodStorage, MealGroup } from "./types";
import { formatDateForInput, hideLoading, isDateInRangeValid, showLoading } from "./Utils";
import { AppwriteDB } from "./appwrite";

export function escapeMarkdownTableCell(text: string): string {
  return text.replace(/\|/g, '\\|');
}

export function initializeExportDates(todayDateString: string): void {
  const today = todayDateString ? new Date(todayDateString + 'T00:00:00') : new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 7);

  getInputById('exportStartDate').value = formatDateForInput(start);
  getInputById('exportEndDate').value = formatDateForInput(today);
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}

function getFoodDisplayName(getFoodItemByName: (foodName: string) => FoodItem, storedName: string): string {
  try {
    const foodItem = getFoodItemByName(storedName);
    return `${foodItem.nameEn} / ${foodItem.name}`;
  } catch {
    return storedName;
  }
}

export function buildExportMarkdown(
  entries: FoodStorage[],
  startDateStr: string,
  endDateStr: string,
  todayDateString: string,
  currentUserName: string,
  getFoodItemByName: (foodName: string) => FoodItem,
  groupFoodEntriesByMeal: (entries: FoodStorage[]) => MealGroup[]
): string {
  const today = todayDateString || formatDateForInput(new Date());
  const now = new Date();
  const generatedAt = `${today} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let totalFiber = 0;

  // Group by date
  const entriesByDate: Record<string, FoodStorage[]> = {};
  entries.forEach(entry => {
    if (!entriesByDate[entry.date]) {
      entriesByDate[entry.date] = [];
    }
    entriesByDate[entry.date].push(entry);
    totalCalories += entry.calories;
    totalProtein += entry.protein;
    totalFat += entry.fat;
    totalCarbs += entry.carbs;
    totalFiber += entry.fiber;
  });

  const allDates: string[] = [];
  const startDate = new Date(startDateStr + 'T00:00:00');
  const endDate = new Date(endDateStr + 'T00:00:00');
  const current = new Date(startDate);
  while (current <= endDate) {
    allDates.push(formatDateForInput(current));
    current.setDate(current.getDate() + 1);
  }

  let markdown = `# Food Log Export\n\n`;
  markdown += `- **Period:** ${startDateStr} to ${endDateStr}\n`;
  markdown += `- **User:** ${currentUserName || 'User'}\n`;
  markdown += `- **Generated:** ${generatedAt}\n\n`;
  markdown += `---\n\n`;

  allDates.forEach(date => {
    const dayEntries = entriesByDate[date] || [];
    const dateObj = new Date(date + 'T00:00:00');
    const dayLabel = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    markdown += `## ${dayLabel}\n\n`;

    if (dayEntries.length === 0) {
      markdown += `*No data for this day.*\n\n`;
      markdown += `---\n\n`;
      return;
    }

    const mealGroups: MealGroup[] = groupFoodEntriesByMeal(dayEntries);
    let dayCalories = 0;
    let dayProtein = 0;
    let dayFat = 0;
    let dayCarbs = 0;
    let dayFiber = 0;

    mealGroups.forEach(group => {
      const roundedProtein = roundMacro(group.totalProtein);
      const roundedFat = roundMacro(group.totalFat);
      const roundedCarbs = roundMacro(group.totalCarbs);

      markdown += `### ${group.label} — ${group.totalCalories} cal • ${roundedProtein}g protein • ${roundedFat}g fat • ${roundedCarbs}g carbs\n\n`;
      markdown += `| Time | Food | Grams | Calories | Protein | Fat | Carbs | Fiber |\n`;
      markdown += `|------|------|------:|---------:|--------:|----:|------:|------:|\n`;

      group.entries.forEach(entry => {
        const displayName = escapeMarkdownTableCell(getFoodDisplayName(getFoodItemByName, entry.name));
        markdown += `| ${entry.time} | ${displayName} | ${entry.grams} | ${entry.calories} | ${roundMacro(entry.protein)} | ${roundMacro(entry.fat)} | ${roundMacro(entry.carbs)} | ${roundMacro(entry.fiber)} |\n`;
      });

      markdown += `\n`;

      dayCalories += group.totalCalories;
      dayProtein += group.totalProtein;
      dayFat += group.totalFat;
      dayCarbs += group.totalCarbs;
      dayFiber += group.entries.reduce((sum, e) => sum + e.fiber, 0);
    });

    markdown += `**Daily total:** ${dayCalories} cal • ${roundMacro(dayProtein)}g protein • ${roundMacro(dayFat)}g fat • ${roundMacro(dayCarbs)}g carbs • ${roundMacro(dayFiber)}g fiber\n\n`;
    markdown += `---\n\n`;
  });

  markdown += `## Period Summary\n\n`;
  markdown += `- **Total days:** ${allDates.length}\n`;
  markdown += `- **Total entries:** ${entries.length}\n`;
  markdown += `- **Total calories:** ${totalCalories}\n`;
  markdown += `- **Total protein:** ${roundMacro(totalProtein)}g\n`;
  markdown += `- **Total fat:** ${roundMacro(totalFat)}g\n`;
  markdown += `- **Total carbs:** ${roundMacro(totalCarbs)}g\n`;
  markdown += `- **Total fiber:** ${roundMacro(totalFiber)}g\n`;

  return markdown;
}

function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function handleExportMarkdown(currentUser: any | null, todayDateString: string,
  getFoodItemByName: (foodName: string) => FoodItem,
  groupFoodEntriesByMeal: (entries: FoodStorage[]) => MealGroup[]
) {
  if (!currentUser) {
    swal('Hey!', 'Please log in to export your food log.', 'info');
    return;
  }

  const startInput = getInputById('exportStartDate').value;
  const endInput = getInputById('exportEndDate').value;

  const validation = isDateInRangeValid(startInput, endInput);
  if (!validation.valid) {
    swal('Hey!', validation.message, 'error');
    return;
  }

  const startDate = new Date(startInput + 'T00:00:00');
  const endDate = new Date(endInput + 'T00:00:00');

  showLoading();

  try {
    const entries = await AppwriteDB.getFoodEntriesForDateRange(startDate, endDate);

    if (!entries || entries.length === 0) {
      hideLoading();
      swal('Info', 'No food entries found for the selected period.', 'info');
      return;
    }

    const foodEntries: FoodStorage[] = entries.map((entry: any) => ({
      id: entry.$id,
      name: entry.name,
      grams: entry.grams,
      calories: entry.calories,
      protein: entry.protein,
      fat: entry.fat,
      carbs: entry.carbs,
      fiber: entry.fiber,
      time: entry.time,
      date: entry.date,
      alkaline: entry.alkaline,
      periodGroup: null,
    }));

    const markdown = buildExportMarkdown(
        foodEntries,
        startInput,
        endInput,
        todayDateString,
        currentUser?.name,
        getFoodItemByName,
        groupFoodEntriesByMeal);
    const filename = `food-log-export_${startInput}_${endInput}.md`;
    downloadMarkdownFile(filename, markdown);

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Export markdown error:', error);
    if (error instanceof Error) {
      swal('Oh no!', 'Failed to export food log: ' + error.message, 'error');
    }
  }
}