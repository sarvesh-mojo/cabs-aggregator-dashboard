import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Mojo Admin Dashboard "
        description="This is Mojoboxx Dashboard for Booking and logs analysis"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
