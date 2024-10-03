import React from 'react';
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from "@/components/ui/menubar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ChartOptionsProps {
    chartType: 'Line' | 'Area' | 'Bar';
    setChartType: (type: 'Line' | 'Area' | 'Bar') => void;
    dataTransformation: 'none' | 'normalize' | 'percentChange';
    setDataTransformation: (transformation: 'none' | 'normalize' | 'percentChange') => void;
    years: number[];
    months: string[];
    setStartYear: (year: number) => void;
    setStartMonth: (month: number) => void;
    setEndYear: (year: number) => void;
    setEndMonth: (month: number) => void;
}

export const ChartOptions: React.FC<ChartOptionsProps> = ({
    chartType,
    setChartType,
    dataTransformation,
    setDataTransformation,
    years,
    months,
    setStartYear,
    setStartMonth,
    setEndYear,
    setEndMonth,
}) => {
    return (
        <Menubar className="mb-4">
            <MenubarMenu>
                <MenubarTrigger>Chart Type: {chartType}</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onClick={() => setChartType('Line')}>Line</MenubarItem>
                    <MenubarItem onClick={() => setChartType('Area')}>Area</MenubarItem>
                    <MenubarItem onClick={() => setChartType('Bar')}>Bar</MenubarItem>
                </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
                <MenubarTrigger>Data Transformation: {dataTransformation === 'none' ? 'None' : dataTransformation === 'normalize' ? 'Normalize' : 'Percentage Change'}</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onClick={() => setDataTransformation('none')}>None</MenubarItem>
                    <MenubarItem onClick={() => setDataTransformation('normalize')}>Normalize (Index to 100)</MenubarItem>
                    <MenubarItem onClick={() => setDataTransformation('percentChange')}>Percentage Change</MenubarItem>
                </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
                <MenubarTrigger>Date Range</MenubarTrigger>
                <MenubarContent>
                    <div className="p-4">
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <div className="mt-1 flex">
                            <Select onValueChange={(value) => setStartYear(Number(value))}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={(value) => setStartMonth(Number(value))}>
                                <SelectTrigger className="w-[120px] ml-2">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((month, index) => (
                                        <SelectItem key={month} value={(index + 1).toString()}>{month}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <label className="block text-sm font-medium text-gray-700 mt-4">End Date</label>
                        <div className="mt-1 flex">
                            <Select onValueChange={(value) => setEndYear(Number(value))}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={(value) => setEndMonth(Number(value))}>
                                <SelectTrigger className="w-[120px] ml-2">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((month, index) => (
                                        <SelectItem key={month} value={(index + 1).toString()}>{month}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    );
};