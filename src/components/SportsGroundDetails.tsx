import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { SportsGround } from '../types';

interface Props {
  grounds: SportsGround[];
}

const SportsGroundDetails: React.FC<Props> = ({ grounds }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const ground = grounds.find(g => g.id === id);

  if (!ground) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Ground not found</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to all grounds
      </button>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="relative h-96">
          {ground.image ? (
            <img
              src={ground.image}
              alt={ground.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
              No image selected
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{ground.name}</h1>
            <div className="flex items-center bg-green-100 px-3 py-1 rounded-full">
              <Star className="w-5 h-5 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">{ground.rating}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Location</h2>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{ground.location}, {ground.area}</span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">Sports Available</h2>
                <div className="flex flex-wrap gap-2">
                  {ground.sports.map(sport => (
                    <span
                      key={sport}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {sport}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">Opening Hours</h2>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>{ground.openingTime}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Pricing</h2>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{ground.pricePerHour}
                  <span className="text-gray-500 text-base font-normal"> per hour</span>
                </p>
              </div>

              <button
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Book Now
              </button>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Distance</h3>
                <p className="text-gray-600">{ground.distance} from your location</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportsGroundDetails;