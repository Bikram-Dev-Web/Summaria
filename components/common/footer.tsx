export default function Footer() {
  return (
    <footer className="flex items-center justify-center h-16 bg-gray-800 text-white">
      <p className="text-sm">
        &copy; {new Date().getFullYear()} My Application. All rights reserved. hello
      </p>
    </footer>
  );
}