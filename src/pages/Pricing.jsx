import { Navigate } from "react-router-dom";

/** Legacy route — consumer pricing removed for standalone deployments. */
export default function Pricing() {
  return <Navigate to="/Usage" replace />;
}
