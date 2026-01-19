import { beforeAll, describe } from "bun:test";
import { initializeTestContext } from "./utils/initialize";
import { setTestContext } from "./utils/setup";

describe("Mirage Bridge Program Tests", () => {
  beforeAll(async () => {
    const context = await initializeTestContext();
    setTestContext(context);
  });

  require("./specs/initialize.spec");
  require("./specs/update_validators.spec");
  require("./specs/pause.spec");
  require("./specs/unpause.spec");
  require("./specs/burn.spec");
  require("./specs/mint.spec");
});
