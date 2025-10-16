"use client";
import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useState } from "react";

export default function DeleteButton() {
    const [open , setOpen] = useState(false);
    const handleDelete = async ()=>{
        //delete summary
        setOpen(false);
    };
  return (
    <div>
      <Dialog open = {open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button
              variant={"ghost"}
              size="icon"
              className="text-gray-500 bg-gray-50 border border-gray-200 hover:text-rose-600 hover:bg-rose-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Summary</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this summary? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="icon"
              className=" bg-gray-50 border border-gray-200 hover:text-gray-600 hover:bg-gray-100"
              onClick={()=> setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className=" bg-gray-900 hover:bg-gray-600 "
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
