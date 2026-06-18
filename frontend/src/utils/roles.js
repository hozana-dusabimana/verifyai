// Display label for a user role. The internal value stays `government`, but the
// UI presents that role as "Media House" (RTV, BTN, TV1, … — outlets that
// publish news and manage journalists).
//
// i18n: the translated labels live under `common.roles.*`. In components, prefer
//   t(roleLabelKey(role), { defaultValue: roleLabel(role) })
// so the label is localized, with the English string as a safe fallback for any
// role not present in the dictionary.
export const roleLabel = (role) => (role === 'government' ? 'Media House' : (role || ''));

// The translation key for a role's display label (see common.json → common.roles).
export const roleLabelKey = (role) => `common.roles.${role || ''}`;
