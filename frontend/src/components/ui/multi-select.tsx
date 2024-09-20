import React, { useState, useMemo } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  maxSelections?: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, className, maxSelections = Infinity }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleValueChange = (value: string, checked: boolean) => {
    if (checked && selected.length < maxSelections) {
      onChange([...selected, value]);
    } else if (!checked) {
      onChange(selected.filter(item => item !== value));
    }
  };

  const filteredAndSortedOptions = useMemo(() => {
    return options
      .filter(option => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aSelected = selected.includes(a.value);
        const bSelected = selected.includes(b.value);
        if (aSelected === bSelected) return a.label.localeCompare(b.label);
        return aSelected ? -1 : 1;
      });
  }, [options, selected, searchTerm]);

  return (
    <div className={`flex flex-col ${className}`}>
      <Input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />
      <ScrollArea className="h-[80px]">
        <div className="space-y-2 p-2">
          {filteredAndSortedOptions.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={selected.includes(option.value)}
                onCheckedChange={(checked) => handleValueChange(option.value, checked as boolean)}
                disabled={!selected.includes(option.value) && selected.length >= maxSelections}
              />
              <Label htmlFor={option.value}>{option.label}</Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};