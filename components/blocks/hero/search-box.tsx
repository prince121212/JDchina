"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SearchBox() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/resources?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/resources');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="mt-8 mx-auto max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="搜索您感兴趣的资源..."
          className="pl-12 pr-20 py-4 text-lg h-14 rounded-full border-2 focus:border-primary shadow-sm hover:shadow-md transition-all duration-200"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button
          size="lg"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-6 py-2 shadow-sm hover:shadow-md transition-all duration-200"
          onClick={handleSearch}
        >
          搜索
        </Button>
      </div>
    </div>
  );
}
