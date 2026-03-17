importScripts('shared.js');

async function bootstrap() {
  try {
    await self.StudyStore.ensureData();
  } catch (error) {
    console.error('Study Note bootstrap failed:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  bootstrap();
});

chrome.runtime.onStartup.addListener(() => {
  bootstrap();
});
