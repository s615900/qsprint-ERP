import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">404 找不到頁面</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            您要找的頁面不存在。{" "}
            <Link href="/" className="text-primary hover:underline">回到儀表板</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
