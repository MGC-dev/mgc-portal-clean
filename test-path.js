const { createStorageFromOptions } = require("@supabase/ssr/dist/main/cookies");
const { storage } = createStorageFromOptions({}, true); // true = isBrowser
console.log(storage.setItem.toString());
