const { createStorageFromOptions } = require("@supabase/ssr/dist/main/cookies");
const { storage } = createStorageFromOptions({}, false);
storage.setItem("test", "testvalue").then(() => {
  console.log("done");
});
