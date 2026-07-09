const { createStorageFromOptions } = require("@supabase/ssr/dist/main/cookies");
const storage = createStorageFromOptions({}, false);
console.log(storage);
