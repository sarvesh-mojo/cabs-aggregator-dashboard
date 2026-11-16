import { ReactNode } from "react";
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { isIndigoCxUser } from "./utils/partnerAccess";

interface ProtectedRoutesProps {
  children: ReactNode;
}

const CX_HOME = "/dashboard/customerCare/HomeCX";

const ProtectedRoutes = ({ children }: ProtectedRoutesProps) => {
  const islogin = useSelector((state: any) => state.authStore.is_login);
  const loginUsername = useSelector((state: any) => state.authStore.login_username);
  const userRights = useSelector((state: any) => state.authStore.user_rights);
  const location = useLocation();

  if (!islogin) {
    return <Navigate to="/login" replace />;
  }

  if (
    isIndigoCxUser(loginUsername, userRights) &&
    location.pathname !== CX_HOME
  ) {
    return <Navigate to={CX_HOME} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoutes;
