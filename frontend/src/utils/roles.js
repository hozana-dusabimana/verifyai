// Display label for a user role. The internal value stays `government`, but the
// UI presents that role as "Media House" (RTV, BTN, TV1, … — outlets that
// publish news and manage journalists). Other roles render as-is (callers
// typically apply CSS `capitalize`).
export const roleLabel = (role) => (role === 'government' ? 'Media House' : (role || ''));
