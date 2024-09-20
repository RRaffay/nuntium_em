import React, { useState, useMemo, useEffect } from 'react';
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
  expanded?: boolean;
  onClose?: () => void;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  className,
  maxSelections = Infinity,
  expanded = false,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState(selected);

  useEffect(() => {
    setLocalSelected(selected);
  }, [selected]);

  const handleValueChange = (value: string, checked: boolean) => {
    let newSelected;
    if (checked && localSelected.length < maxSelections) {
      newSelected = [...localSelected, value];
    } else if (!checked) {
      newSelected = localSelected.filter(item => item !== value);
    } else {
      return; // Do nothing if trying to add more than maxSelections
    }
    setLocalSelected(newSelected);
    onChange(newSelected);
  };

  const filteredAndSortedOptions = useMemo(() => {
    return options
      .filter(option => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aSelected = localSelected.includes(a.value);
        const bSelected = localSelected.includes(b.value);
        if (aSelected === bSelected) return a.label.localeCompare(b.label);
        return aSelected ? -1 : 1;
      });
  }, [options, localSelected, searchTerm]);

  return (
    <div className={`flex flex-col ${className}`}>
      <Input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />
      <ScrollArea className={`${expanded ? 'h-[400px]' : 'h-[100px]'} mb-4`}>
        <div className="space-y-2 p-2">
          {filteredAndSortedOptions.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={localSelected.includes(option.value)}
                onCheckedChange={(checked) => handleValueChange(option.value, checked as boolean)}
                disabled={!localSelected.includes(option.value) && localSelected.length >= maxSelections}
              />
              <Label htmlFor={option.value}>{option.label}</Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};