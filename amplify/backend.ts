import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { storage } from "./storage/resource";
import { thumbnailFunction } from "./functions/thumbnail";

const backend = defineBackend({
  auth,
  storage,
  thumbnailFunction,
});

// セルフサインアップを無効化（管理者のみがユーザーを作成可能）
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};
