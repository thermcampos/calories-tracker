import { getDivById } from "./utils/domUtils";
import { appState } from "./state";
import { ExportDateValidation } from "./types";

export const SECOND = 1000;
export const QUICK_DELAY = 0.3 * SECOND;

export function showLoading() {
  getDivById('loading-overlay').classList.remove('hidden');
}

export function hideLoading() {
  getDivById('loading-overlay').classList.add('hidden');
}

export function scrollToCalendarView() {
  const calendarSection = document.querySelector('.calendar-section') as HTMLElement;
  if (calendarSection) {
    calendarSection.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }
}

export function handleMobileCalendarClick() {
  closeMobileMenu();
  scrollToCalendarView();
}

export function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('hidden');
  }
}

export function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.classList.add('hidden');
  }
}

export function getCleanName(foodName: string): string  {
  const newName = foodName
    .replace(/á/g, 'a')
    .replace(/ã/g, 'a')
    .replace(/â/g, 'a')
    .replace(/ê/g, 'e')
    .replace(/é/g, 'e')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ç/g, 'c');
  return newName.toLowerCase();
}

export function navigateResultsKeyboard(direction: number) {
  const items = getDivById('searchResults').querySelectorAll('.search-result-item');
  if (items.length === 0) return;
  
  // Remove current highlight
  if (appState.currentHighlightIndex >= 0) {
      items[appState.currentHighlightIndex].classList.remove('highlighted');
  }
  
  // Calculate new index
  appState.currentHighlightIndex += direction;
  if (appState.currentHighlightIndex < 0) appState.currentHighlightIndex = items.length - 1;
  if (appState.currentHighlightIndex >= items.length) appState.currentHighlightIndex = 0;

  // Add new highlight
  items[appState.currentHighlightIndex].classList.add('highlighted');
  items[appState.currentHighlightIndex].scrollIntoView({ block: 'nearest' });
}

export function hideSearchResults() {
  getDivById('searchResults').classList.remove('show');
  appState.currentHighlightIndex = -1;
}

export function toggleCardHandler(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  
  const card = e.currentTarget as HTMLElement;
  card.classList.toggle('expanded');
  
  const cardDetails = card.nextElementSibling as HTMLElement;
  if (cardDetails && cardDetails.classList.contains('card-details')) {
    cardDetails.classList.toggle('expanded');
  }
}

export function delay(seconds: number) {
  return new Promise(resolve => setTimeout(resolve, seconds));
}

const icons = {
  'fats': '🥑 🍳 🍟',
  'proteins': '🫘 🥩 🥚',
  'carbs': '🍞 🥔 🍠',
  'leaves': '🥬 🥗 🌿',
  'fruits': '🍊 🍇 🍎',
  'low carb': '🥦 🍅 🍓',
  'dairy': '🧀 🧈 🥛'
};

export function getIcon(category: keyof typeof icons) {
  return icons[category];
}

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateInRangeValid(start: string, end: string): ExportDateValidation {
  if (!start || !end) {
    return { valid: false, message: 'Please select both start and end dates.' };
  }

  if (end < start) {
    return { valid: false, message: 'End date must be the same or later than the start date.' };
  }

  const today = appState.todayDateString || formatDateForInput(new Date());
  if (start > today || end > today) {
    return { valid: false, message: 'Dates must be in the past or today.' };
  }

  return { valid: true, message: '' };
}

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function enforceIntegerInput(e: Event) {
  const input = e.target as HTMLInputElement;
  input.value = input.value.replace(/[^0-9]/g, '');
}

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      