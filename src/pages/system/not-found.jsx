import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl p-10 text-center">
      <div className="text-3xl font-bold">404</div>
      <div className="mt-2 text-sm text-slate-500">Page not found</div>
      <div className="mt-6">
        <Button asChild>
          <Link to="/">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
