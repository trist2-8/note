importScripts('shared.js');

async function bootstrap() {
  try {
    if (!self.StudyStore?.ensureData) {
      throw new Error('StudyStore chưa sẵn sàng trong service worker.');
    }
    await self.StudyStore.ensureData();
  } catch (error) {
    console.error('Study Note bootstrap failed:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void bootstrap();
});

chrome.runtime.onStartup.addListener(() => {
  void bootstrap();
});
