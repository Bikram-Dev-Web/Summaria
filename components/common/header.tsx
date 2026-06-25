import NavLink from "./nav-link";
import { FileText } from "lucide-react";
import { Button } from "../ui/button";
import { Show, UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <nav className="container flex items-center justify-between py-4 lg:px-6 px-2 mx-auto">
      <div className="flex lg:flex-1">
        <NavLink href="/" className="flex items-center gap-1 lg:gap-2 shrink-0">
          <FileText className="w-5 h-5 lg:w-8 lg:h-8 text-gray-900 hover:rotate-12 transform transition duration-200 ease-in-out" />
          <span className="font-extrabold lg:text-xl text-gray-950">
            Summarai
          </span>
        </NavLink>
      </div>
      
      <div className="flex flex-1 items-center justify-center gap-4">
        <NavLink href="/#pricing">Pricing</NavLink>
        
        {/* Replaced <SignedIn> with <Show when="signed-in"> */}
        <Show when="signed-in">
          <NavLink href="/dashboard">Your summaria</NavLink>
        </Show>
      </div>
      
      <div className="flex lg:justify-center lg:flex-1 items-center gap-4">
        <Show when="signed-in">
          <div className="flex items-center gap-2 ">
            <NavLink href="/upload">Upload a PDF</NavLink>
            <div>Pro</div>
            {/* Removed the redundant nested <SignedIn> wrapper here */}
            <UserButton />
          </div>
        </Show>

        {/* Fixed logic error: Show "Sign-In" link only when signed out */}
        <Show when="signed-out">
          <NavLink href="/sign-in">Sign-In</NavLink>
        </Show>
      </div>
    </nav>
  );
}