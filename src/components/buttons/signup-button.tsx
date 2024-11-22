export const SignupButton = () => {
  return (
    <a
      className="button__sign-up"
      href="/auth/login?returnTo=/profile&screen_hint=signup"
    >
      Sign Up
    </a>
  );
};
