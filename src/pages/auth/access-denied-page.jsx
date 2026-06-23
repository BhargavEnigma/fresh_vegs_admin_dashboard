import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { buttonVariants } from "../../components/ui/button";

export function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center bg-slate-50 px-4 dark:bg-slate-950">
      <Card className="mx-auto w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-500">
            This account does not have access to the admin panel.
          </p>
          <Link to="/login" className={buttonVariants()}>
            Return to login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
