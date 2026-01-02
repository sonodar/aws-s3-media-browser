/// <reference types="vite/client" />

declare module '../amplify_outputs.json' {
  const outputs: import('aws-amplify/adapter-core').ResourcesConfig;
  export default outputs;
}
