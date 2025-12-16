'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from "lucide-react";

const CustomDropdown = ({ value, setValue, dropdownMenu}) => {
 const [open, setOpen] = useState(false);
 
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

 
  const handleSelect = (value) => {
    setValue(value);
    setOpen(false);
  };


  return (
   <>
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Button */}
      <button
        onClick={() => setOpen(!open)}
        className="border border-[var(--primary-color)] w-full md:w-auto px-3 py-1 rounded-sm text-sm cursor-pointer flex items-center gap-2"
      >
      { value ? value : 'Select' }
        <span className="">{open ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</span>
      </button>

      {/* Dropdown Menu */}
      {open && (


        <div className="absolute -right-5 mt-2 w-44 bg-base-100 shadow-md rounded-md z-50">
          <ul className="py-1 text-sm max-h-56 overflow-y-auto">

            {
               dropdownMenu && dropdownMenu.map((item, index) => (
                <li
                  key={index}
                    onClick={() => handleSelect(item)}
                    className="px-4 py-2 hover:bg-base-200 cursor-pointer whitespace-nowrap"
                >
                  {item}
                </li>
              )) 
            }
           
          </ul>
        </div>
      )}
    </div>
   </>
  )
}

export default CustomDropdown