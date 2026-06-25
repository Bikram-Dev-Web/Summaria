export default function Footer() {
  return (
    <footer className="flex h-16 items-center justify-center bg-gray-800 text-white">
      <p className="text-sm">
        &copy; {new Date().getFullYear()} Summari. All rights reserved.
      </p>
    </footer>
  );
}
