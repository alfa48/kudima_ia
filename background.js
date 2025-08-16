// Contextual Whisper - Background Script

// Track tab behavior for cross-tab analysis
const tabBehavior = new Map();

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  trackTabSwitch(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    trackPageLoad(tab);
  }
});

function trackTabSwitch(tab) {
  if (!tab.url || tab.url.startsWith('chrome://')) return;
  
  const domain = new URL(tab.url).hostname;
  const now = Date.now();
  
  if (!tabBehavior.has(tab.id)) {
    tabBehavior.set(tab.id, {
      domain,
      url: tab.url,
      switches: 0,
      lastActive: now,
      totalTime: 0
    });
  }
  
  const behavior = tabBehavior.get(tab.id);
  behavior.switches++;
  behavior.lastActive = now;
}

function trackPageLoad(tab) {
  if (!tab.url || tab.url.startsWith('chrome://')) return;
  
  const domain = new URL(tab.url).hostname;
  const now = Date.now();
  
  tabBehavior.set(tab.id, {
    domain,
    url: tab.url,
    switches: 0,
    lastActive: now,
    totalTime: 0,
    loadTime: now
  });
}

// Analyze research patterns
function analyzeResearchPattern() {
  const activeTabs = Array.from(tabBehavior.values()).filter(
    behavior => Date.now() - behavior.lastActive < 300000 // 5 minutes
  );
  
  const domains = [...new Set(activeTabs.map(b => b.domain))];
  const sameDomainTabs = activeTabs.filter((b, i, arr) => 
    arr.filter(other => other.domain === b.domain).length > 1
  );
  
  return {
    totalActiveTabs: activeTabs.length,
    uniqueDomains: domains.length,
    sameDomainCount: sameDomainTabs.length,
    isResearchMode: activeTabs.length > 5 || sameDomainTabs.length > 2
  };
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getResearchContext') {
    const pattern = analyzeResearchPattern();
    sendResponse(pattern);
  }
  
  if (request.action === 'logConfusion') {
    console.log('Confusion detected:', request.data);
    // Here you could send analytics, store in local storage, etc.
  }
});

// Clean up old tab data periodically
setInterval(() => {
  const now = Date.now();
  for (const [tabId, behavior] of tabBehavior.entries()) {
    if (now - behavior.lastActive > 3600000) { // 1 hour
      tabBehavior.delete(tabId);
    }
  }
}, 300000); // Clean every 5 minutes