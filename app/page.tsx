import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="grid">
      <span className="text-2xl font-bold">Hello World</span>
      <Button
        variant="ghost"
        className="bg-green-700  text-opacity-70 font-sans
      "
      >
        hello
      </Button>
    </div>
  );
}
