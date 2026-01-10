import React from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import { Amplify } from "aws-amplify";
import App from "./App";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
