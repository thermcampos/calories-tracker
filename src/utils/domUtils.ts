export const getInputById = (elementId: string): HTMLInputElement => {
  const el = document.getElementById(elementId) as HTMLInputElement;
  if (!el) {
    throw new Error(`Input Element id ${elementId} not found!`);
  }
  return el;
};

export const getDivById = (elementId: string): HTMLElement => {
  const el = document.getElementById(elementId) as HTMLElement;
  if (!el) {
    throw new Error(`HTML Element id ${elementId} not found!`);
  }
  return el;
}

export const getButtonById = (elementId: string): HTMLButtonElement => {
  const el = document.getElementById(elementId) as HTMLButtonElement;
  if (!el) {
    throw new Error(`HTML Button Element id ${elementId} not found!`);
  }
  return el;
}

export const getButtonListByClassName = (name: string): Array<HTMLButtonElement> => {
  const el = document.getElementsByClassName(name);
  if (!el) {
    throw new Error(`HTML Button List Elements not found for class ${name}!`);
  }
  return Array.from(el) as Array<HTMLButtonElement>;
}

export const showFoodPreview = (show: boolean) => {
  getDivById('food-preview').classList = `add-food-form-item ${show ? 'display-block' : 'display-none'}`;
}
