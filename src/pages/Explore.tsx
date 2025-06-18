import React, { useState } from 'react';

const demoProfiles = [
  {
    id: 1,
    name: "John Smith",
    specialty: "Cinematographer",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 2,
    name: "Sarah Parker",
    specialty: "Director",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 3,
    name: "Harry Wilson",
    specialty: "Editor",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 4,
    name: "Peter Johnson",
    specialty: "Sound Designer",
    image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=1000",
  }
];

const Explore = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProfiles, setFilteredProfiles] = useState(demoProfiles);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = demoProfiles.filter(profile => 
      profile.name.toLowerCase().includes(term) || 
      profile.specialty.toLowerCase().includes(term)
    );
    setFilteredProfiles(filtered);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Explore</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search filmmakers..."
          value={searchTerm}
          onChange={handleSearch}
          className="bg-gray-800/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700 focus:border-blue-500 outline-none w-full"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredProfiles.map((profile) => (
          <div key={profile.id} className="border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
            <img
              src={profile.image}
              alt={profile.name}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
            <h3 className="text-lg font-semibold">{profile.name}</h3>
            <p className="text-gray-400">{profile.specialty}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Explore;