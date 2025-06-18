import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectProfile = (profile: Profile) => {
    navigate(`/profile/${profile.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Search</h2>
      <SearchBar onSelect={handleSelectProfile} />
    </div>
  );
};

export default SearchPage;