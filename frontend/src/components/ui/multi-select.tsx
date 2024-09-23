import React, { useState, useMemo, useEffect, ReactNode } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface Option {
  value: string;
  label: string | ReactNode;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  maxSelections?: number;
  minSelections?: number;
  expanded?: boolean;
  onClose?: () => void;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  className = '',
  maxSelections = Infinity,
  minSelections = 0,
  expanded = false,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>(selected);

  useEffect(() => {
    setLocalSelected(selected);
  }, [selected]);

  const handleValueChange = (value: string, checked: boolean) => {
    let newSelected = checked
      ? [...localSelected, value].slice(0, maxSelections)
      : localSelected.filter(item => item !== value);

    // Ensure at least minSelections are selected
    if (newSelected.length < minSelections) {
      newSelected = localSelected;
    }

    setLocalSelected(newSelected);
    onChange(newSelected);
  };

  const filteredAndSortedOptions = useMemo(() => {
    return options
      .filter(option =>
        typeof option.label === 'string'
          ? option.label.toLowerCase().includes(searchTerm.toLowerCase())
          : true // Always include options with ReactNode labels in search results
      )
      .sort((a, b) => {
        const aSelected = localSelected.includes(a.value);
        const bSelected = localSelected.includes(b.value);
        return aSelected === bSelected
          ? (typeof a.label === 'string' && typeof b.label === 'string'
            ? a.label.localeCompare(b.label)
            : 0)
          : aSelected ? -1 : 1;
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
      <ScrollArea className={`${expanded ? 'h-[70vh]' : 'h-[100px]'} mb-4`}>
        <div className="space-y-2 p-2">
          {filteredAndSortedOptions.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={localSelected.includes(option.value)}
                onCheckedChange={(checked) => handleValueChange(option.value, checked as boolean)}
                disabled={
                  (!localSelected.includes(option.value) && localSelected.length >= maxSelections) ||
                  (localSelected.includes(option.value) && localSelected.length <= minSelections)
                }
              />
              <Label htmlFor={option.value}>{option.label}</Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};