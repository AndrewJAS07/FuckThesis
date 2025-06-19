import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Search, MapPin } from 'lucide-react-native';
import { GOOGLE_MAPS_ENDPOINTS, buildGoogleMapsUrl, PLACE_TYPES } from '../lib/google-maps-config';

interface Place {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GooglePlacesAutocompleteProps {
  placeholder?: string;
  onPlaceSelected: (place: Place, details: any) => void;
  style?: any;
  containerStyle?: any;
  inputStyle?: any;
  listStyle?: any;
  itemStyle?: any;
  itemTextStyle?: any;
  itemSubTextStyle?: any;
  loadingIndicatorColor?: string;
  minLength?: number;
  query?: string;
  onQueryChange?: (query: string) => void;
  types?: string;
  country?: string;
  language?: string;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  placeholder = 'Search for a place...',
  onPlaceSelected,
  style,
  containerStyle,
  inputStyle,
  listStyle,
  itemStyle,
  itemTextStyle,
  itemSubTextStyle,
  loadingIndicatorColor = '#007AFF',
  minLength = 2,
  query = '',
  onQueryChange,
  types = PLACE_TYPES.GEOCODE,
  country = 'PH', // Philippines
  language = 'en',
}) => {
  const [predictions, setPredictions] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(query);

  const searchPlaces = async (text: string) => {
    if (text.length < minLength) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    try {
      const params = {
        input: text,
        types: types,
        components: `country:${country}`,
        language: language,
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.PLACES_AUTOCOMPLETE, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.predictions) {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    try {
      const params = {
        place_id: placeId,
        fields: 'geometry,formatted_address,name',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.PLACE_DETAILS, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.result) {
        return data.result;
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
    return null;
  };

  const handlePlaceSelect = async (place: Place) => {
    const details = await getPlaceDetails(place.place_id);
    onPlaceSelected(place, details);
    setInputValue(place.description);
    setPredictions([]);
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    onQueryChange?.(text);
    searchPlaces(text);
  };

  const renderItem = ({ item }: { item: Place }) => (
    <TouchableOpacity
      style={[styles.item, itemStyle]}
      onPress={() => handlePlaceSelect(item)}
    >
      <MapPin size={16} color="#666" style={styles.itemIcon} />
      <View style={styles.itemTextContainer}>
        <Text style={[styles.itemText, itemTextStyle]}>
          {item.structured_formatting.main_text}
        </Text>
        <Text style={[styles.itemSubText, itemSubTextStyle]}>
          {item.structured_formatting.secondary_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.inputContainer, style]}>
        <Search size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholderTextColor="#999"
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color={loadingIndicatorColor}
            style={styles.loadingIndicator}
          />
        )}
      </View>
      
      {predictions.length > 0 && (
        <FlatList
          data={predictions}
          renderItem={renderItem}
          keyExtractor={(item) => item.place_id}
          style={[styles.list, listStyle]}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  list: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default GooglePlacesAutocomplete; 