import { defineAuth } from "@aws-amplify/backend";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    // WebAuthn (パスキー) 認証を有効化
    // 環境変数が設定されている場合はカスタム RelyingPartyID を使用
    // 未設定の場合は Amplify デフォルト動作（サンドボックス: localhost、ブランチデプロイ: Amplify ドメイン）
    webAuthn: process.env.WEBAUTHN_RELYING_PARTY_ID
      ? {
          relyingPartyId: process.env.WEBAUTHN_RELYING_PARTY_ID,
          userVerification: "preferred",
        }
      : true,
  },
});
