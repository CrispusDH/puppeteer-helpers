import { ClickOptions, ElementHandle, Page } from 'puppeteer';
import { waitFor } from './wait-for';
import {
  isElementDisabled,
  isElementFound,
  isElementInteractableAfterFn, isElementVisible,
  isUrlChangedAfterFn,
} from './predicates';
import { clickDelay, typeDelay } from './constants';

export const getElement = async (
  page: Page,
  selector: string,
): Promise<ElementHandle> => {
  await waitFor(() => isElementFound(page, selector), {
    message: `Element with selector: "${selector}" was not found`,
  });
  await waitFor(() => isElementVisible(page, selector), {
    message: `Element with selector: "${selector}" was not visible, but found`,
  });
  await waitFor(() => isElementDisabled(page, selector), {
    message: `Element with selector: "${selector}" was disabled, but found and visible`,
  });
  return page.$(selector);
};

export const click = async (
  page: Page,
  selectorOrElement: string | ElementHandle,
  options?: Partial<ExtendedClickOptions>
): Promise<void> => {
  const defaultOptions: ExtendedClickOptions = {
    delay: clickDelay,
    shouldURLbeChanged: false,
    waitForElement: '',
  };
  const mergedOptions = { ...defaultOptions, ...options };
  if (mergedOptions.shouldURLbeChanged) {
    await clickWithWaitingChangedURL(page, selectorOrElement, mergedOptions);
  } else if (!!mergedOptions.waitForElement) {
    await clickWithWaitingAnotherElement(page, selectorOrElement, mergedOptions);
  } else {
    let element: ElementHandle;
    if (typeof selectorOrElement === 'string') {
      element = await getElement(page, selectorOrElement);
    } else {
      element = selectorOrElement;
    }
    await element.click(mergedOptions);
  }
};

const clickWithWaitingAnotherElement = async (
  page: Page,
  selectorOrElement: string | ElementHandle,
  mergedOptions: ExtendedClickOptions
) => {
  const recursionOptions: ExtendedClickOptions = {
    ...mergedOptions,
    waitForElement: ''
  };
  await waitFor(
    () => isElementInteractableAfterFn(
      page,
      mergedOptions.waitForElement,
      () => click(page, selectorOrElement, recursionOptions)
    )
  )
};

const clickWithWaitingChangedURL = async (
  page: Page,
  selectorOrElement: string | ElementHandle,
  mergedOptions: ExtendedClickOptions
): Promise<void> => {
  const recursionOptions: ExtendedClickOptions = { ...mergedOptions, shouldURLbeChanged: false };
  await waitFor(
    () => isUrlChangedAfterFn(
      page,
      () => click(page, selectorOrElement, recursionOptions)
    )
  )
};

export const type = async (
  text: string,
  page: Page,
  selectorOrElement: string | ElementHandle,
  options?: Partial<TypeOptions>
): Promise<void> => {
  const defaultOptions: TypeOptions = { delay: typeDelay, clear: false };
  const mergedOptions = { ...defaultOptions, ...options };
  let element: ElementHandle;
  if (typeof selectorOrElement === 'string') {
    element = await getElement(page, selectorOrElement);
  } else {
    element = selectorOrElement;
  }
  if (mergedOptions.clear) {
    await clear(page, selectorOrElement);
  }
  await element.type(text, { delay: mergedOptions.delay });
};

export const getText = async (page: Page, selectorOrElement: string | ElementHandle): Promise<string> => {
  let element: ElementHandle;
  if (typeof selectorOrElement === 'string') {
    element = await getElement(page, selectorOrElement);
  } else {
    element = selectorOrElement;
  }
  return page.evaluate((node: Element) => node.textContent, element)
};

export const getAttribute = async (
  attribute: string,
  page: Page,
  selectorOrElement: string | ElementHandle,
): Promise<string | null> => {
  let element: ElementHandle;
  if (typeof selectorOrElement === 'string') {
    element = await getElement(page, selectorOrElement);
  } else {
    element = selectorOrElement;
  }
  return page.evaluate((node: Element, text: string) => node.getAttribute(text), element, attribute);
};

const clear = async (page: Page, selectorOrElement: string | ElementHandle): Promise<void> => {
  await click(page, selectorOrElement,  { clickCount: 3, delay: 20 });
};

interface TypeOptions {
  delay: number,
  clear: boolean
}

interface ExtendedClickOptions extends ClickOptions {
  shouldURLbeChanged: boolean,
  waitForElement: string,
}
