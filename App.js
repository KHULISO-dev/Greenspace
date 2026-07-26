import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  FlatList,
  Image,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const App = () => {
  const [plantName, setPlantName] = useState('');
  const [gps, setGps] = useState('');
  const [notes, setNotes] = useState('');
  const [soilType, setSoilType] = useState('');
  const [weather, setWeather] = useState('');
  const [slope, setSlope] = useState('');
  const [plantHeight, setPlantHeight] = useState('');
  const [flowerColour, setFlowerColour] = useState('#7f8c8d');
  const [abundance, setAbundance] = useState(3);
  const [photo, setPhoto] = useState(null);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Press "Get GPS" or enter manually');

  useEffect(() => {
    requestPermissions();
    loadObservations();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ];
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        console.log('Permissions:', granted);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const loadObservations = async () => {
    try {
      const data = await AsyncStorage.getItem('field_observations');
      if (data) {
        setObservations(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading observations:', error);
    }
  };

  const saveObservations = async (newObservations) => {
    try {
      await AsyncStorage.setItem('field_observations', JSON.stringify(newObservations));
      setObservations(newObservations);
    } catch (error) {
      console.error('Error saving observations:', error);
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    setLocationStatus('Getting location...');

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const gpsString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setGps(gpsString);
        setLocationStatus(`✅ GPS: ${gpsString}`);
        setLoading(false);
      },
      (error) => {
        console.error('GPS Error:', error);
        let msg = '⚠️ GPS error. Type manually.';
        if (error.code === 1) msg = '⚠️ Permission denied. Enable location.';
        else if (error.code === 2) msg = '⚠️ Location unavailable.';
        else if (error.code === 3) msg = '⚠️ Timeout. Retry.';
        setLocationStatus(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const takePhoto = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.error) {
        console.log('Camera Error: ', response.error);
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setPhoto(`data:${asset.type};base64,${asset.base64}`);
      }
    });
  };

  const pickPhoto = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setPhoto(`data:${asset.type};base64,${asset.base64}`);
      }
    });
  };

  const saveObservation = () => {
    if (!plantName.trim()) {
      Alert.alert('Error', 'Please enter a plant name.');
      return;
    }

    const newObservation = {
      id: Date.now(),
      plantName: plantName.trim(),
      gps: gps || 'not recorded',
      notes: notes.trim() || '',
      soilType: soilType || '',
      weather: weather || '',
      slope: slope || '',
      plantHeight: plantHeight ? `${plantHeight} cm` : '',
      flowerColour: flowerColour || '',
      abundance: abundance.toString(),
      photoData: photo || null,
      timestamp: new Date().toISOString(),
    };

    const updatedObservations = [...observations, newObservation];
    saveObservations(updatedObservations);

    // Reset form
    setPlantName('');
    setGps('');
    setNotes('');
    setSoilType('');
    setWeather('');
    setSlope('');
    setPlantHeight('');
    setFlowerColour('#7f8c8d');
    setAbundance(3);
    setPhoto(null);
    setLocationStatus('✅ Observation saved!');

    Alert.alert('Success', 'Observation saved successfully!');
  };

  const deleteObservation = (id) => {
    Alert.alert(
      'Delete Observation',
      'Are you sure you want to delete this observation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const filtered = observations.filter((obs) => obs.id !== id);
            saveObservations(filtered);
          },
        },
      ]
    );
  };

  const exportCSV = async () => {
    if (!observations.length) {
      Alert.alert('No Data', 'No observations to export.');
      return;
    }

    const headers = ['PlantName', 'GPS', 'Notes', 'SoilType', 'Weather', 'Slope', 'PlantHeight', 'FlowerColour', 'Abundance', 'Timestamp'];
    const rows = [headers.join(',')];

    observations.forEach((obs) => {
      const row = [
        `"${obs.plantName.replace(/"/g, '""')}"`,
        `"${(obs.gps || '').replace(/"/g, '""')}"`,
        `"${(obs.notes || '').replace(/"/g, '""')}"`,
        `"${(obs.soilType || '').replace(/"/g, '""')}"`,
        `"${(obs.weather || '').replace(/"/g, '""')}"`,
        `"${(obs.slope || '').replace(/"/g, '""')}"`,
        `"${(obs.plantHeight || '').replace(/"/g, '""')}"`,
        `"${(obs.flowerColour || '').replace(/"/g, '""')}"`,
        `"${(obs.abundance || '').replace(/"/g, '""')}"`,
        `"${obs.timestamp}"`,
      ];
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');
    const filename = `field_observations_${new Date().toISOString().slice(0, 19)}.csv`;
    const path = `${RNFS.DocumentDirectoryPath}/${filename}`;

    try {
      await RNFS.writeFile(path, csvContent, 'utf8');
      Alert.alert('Success', `CSV saved to: ${path}`);
      await Share.open({
        url: `file://${path}`,
        type: 'text/csv',
      });
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save CSV file.');
    }
  };

  const exportGeoJSON = async () => {
    if (!observations.length) {
      Alert.alert('No Data', 'No observations to export.');
      return;
    }

    const features = observations.map((obs) => {
      let coords = null;
      const match = (obs.gps || '').match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      if (match) {
        coords = [parseFloat(match[2]), parseFloat(match[1])];
      }
      return {
        type: 'Feature',
        geometry: coords ? { type: 'Point', coordinates: coords } : null,
        properties: {
          name: obs.plantName,
          notes: obs.notes,
          soilType: obs.soilType,
          weather: obs.weather,
          slope: obs.slope,
          plantHeight: obs.plantHeight,
          flowerColour: obs.flowerColour,
          abundance: obs.abundance,
          timestamp: obs.timestamp,
        },
      };
    });

    const geojson = {
      type: 'FeatureCollection',
      features: features,
    };

    const geojsonContent = JSON.stringify(geojson, null, 2);
    const filename = `field_observations_${new Date().toISOString().slice(0, 19)}.geojson`;
    const path = `${RNFS.DocumentDirectoryPath}/${filename}`;

    try {
      await RNFS.writeFile(path, geojsonContent, 'utf8');
      Alert.alert('Success', `GeoJSON saved to: ${path}`);
      await Share.open({
        url: `file://${path}`,
        type: 'application/json',
      });
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save GeoJSON file.');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      '⚠️ Delete ALL observations? This action is permanent.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            saveObservations([]);
            Alert.alert('Success', 'All data cleared.');
          },
        },
      ]
    );
  };

  const renderObservation = ({ item }) => (
    <View style={styles.obsCard}>
      <View style={styles.obsHeader}>
        <Text style={styles.obsName}>🌾 {item.plantName}</Text>
        <Text style={styles.obsDate}>{new Date(item.timestamp).toLocaleString()}</Text>
      </View>
      <View style={styles.obsMeta}>
        <Text style={styles.obsMetaText}>📍 {item.gps || '—'}</Text>
        <Text style={styles.obsMetaText}>📝 {(item.notes || '').slice(0, 40)}{(item.notes || '').length > 40 ? '…' : ''}</Text>
      </View>
      <View style={styles.obsMeta}>
        <Text style={styles.obsTag}>🌱 {item.soilType || '—'}</Text>
        <Text style={styles.obsTag}>☀️ {item.weather || '—'}</Text>
        <Text style={styles.obsTag}>⛰️ {item.slope || '—'}</Text>
        <Text style={styles.obsTag}>📏 {item.plantHeight || '—'}</Text>
        <Text style={styles.obsTag}>🌸 {item.flowerColour || '—'}</Text>
        <Text style={styles.obsTag}>📊 {item.abundance || '—'}</Text>
      </View>
      {item.photoData && (
        <Image source={{ uri: item.photoData }} style={styles.obsImage} />
      )}
      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteObservation(item.id)}>
        <Text style={styles.deleteButtonText}>🗑️ Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🌿 Field Observation Logger</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>v2 · Professional</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>🌱 Plant name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Scientific / common name"
              value={plantName}
              onChangeText={setPlantName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📍 GPS coordinates</Text>
            <View style={styles.gpsRow}>
              <TextInput
                style={[styles.input, styles.gpsInput]}
                placeholder="e.g. -22.945, 30.494"
                value={gps}
                onChangeText={setGps}
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={getCurrentLocation}>
                <Text style={styles.buttonText}>📡 Get GPS</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.locationStatus}>{locationStatus}</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📝 Field notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Growing near stream, flowers pink, 1.5m tall"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>🧪 Soil type</Text>
              <TextInput
                style={styles.input}
                placeholder="Select soil type"
                value={soilType}
                onChangeText={setSoilType}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>☀️ Weather</Text>
              <TextInput
                style={styles.input}
                placeholder="Select weather"
                value={weather}
                onChangeText={setWeather}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>⛰️ Slope / aspect</Text>
              <TextInput
                style={styles.input}
                placeholder="Select aspect"
                value={slope}
                onChangeText={setSlope}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>📏 Height (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 150"
                value={plantHeight}
                onChangeText={setPlantHeight}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>🌸 Flower colour</Text>
              <TouchableOpacity
                style={[styles.colorPicker, { backgroundColor: flowerColour }]}
                onPress={() => {
                  const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0000ff', '#8800ff', '#ffffff', '#000000', '#7f8c8d'];
                  Alert.alert(
                    'Select Color',
                    'Choose a color:',
                    colors.map((color) => ({
                      text: '',
                      onPress: () => setFlowerColour(color),
                    })),
                  );
                }}
              >
                <Text style={styles.colorPickerText}>Pick Color</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>📊 Abundance (1–5)</Text>
              <View style={styles.rangeContainer}>
                <Text style={styles.rangeValue}>{abundance}</Text>
                <View style={styles.rangeButtons}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.rangeButton, abundance === value && styles.rangeButtonActive]}
                      onPress={() => setAbundance(value)}
                    >
                      <Text style={[styles.rangeButtonText, abundance === value && styles.rangeButtonTextActive]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📸 Photo</Text>
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Text style={styles.buttonText}>📷 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
                <Text style={styles.buttonText}>🖼️ Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
            {photo && (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photo }} style={styles.previewImage} />
                <TouchableOpacity onPress={() => setPhoto(null)}>
                  <Text style={styles.removePhotoText}>Remove Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveObservation}>
            <Text style={styles.saveButtonText}>💾 SAVE OBSERVATION</Text>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={exportCSV}>
              <Text style={styles.actionButtonText}>📎 CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={exportGeoJSON}>
              <Text style={styles.actionButtonText}>🗺️ GeoJSON</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={clearAllData}>
              <Text style={[styles.actionButtonText, styles.dangerButtonText]}>🗑️ Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 My observations</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{observations.length}</Text>
            </View>
          </View>
          {observations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>🌱 No observations yet. Add your first plant.</Text>
            </View>
          ) : (
            <FlatList
              data={observations}
              renderItem={renderObservation}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerName}>🌿 Greenspace</Text>
          <Text style={styles.footerContact}>Chuma Khuliso — Honours (Botany), University of Venda</Text>
          <Text style={styles.footerContact}>Email: ChumaGrandmaster@gmail.com</Text>
          <Text style={styles.footerContact}>Contact: 064 099 8447</Text>
          <Text style={styles.footerNote}>Offline storage · CSV / GeoJSON export</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f6f3',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 36,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#eaf1ec',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a3e2f',
  },
  badge: {
    backgroundColor: '#dff0e6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 30,
  },
  badgeText: {
    color: '#1a4d36',
    fontSize: 12,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '500',
    fontSize: 14,
    textTransform: 'uppercase',
    color: '#3b5b4b',
    marginBottom: 6,
  },
  required: {
    color: '#a54f4f',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dce8e1',
    borderRadius: 18,
    padding: 12,
    fontSize: 16,
    color: '#1d3228',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsInput: {
    flex: 1,
  },
  locationStatus: {
    fontSize: 14,
    marginTop: 6,
    color: '#2a6b4b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  colorPicker: {
    height: 50,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#dce8e1',
  },
  colorPickerText: {
    color: '#fff',
    fontWeight: '600',
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d4f39',
    minWidth: 30,
  },
  rangeButtons: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#eef3f0',
    alignItems: 'center',
  },
  rangeButtonActive: {
    backgroundColor: '#1d4f39',
  },
  rangeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d3b2d',
  },
  rangeButtonTextActive: {
    color: '#ffffff',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  photoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#e9f1ec',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c6dbd0',
  },
  buttonText: {
    color: '#1d4f39',
    fontWeight: '600',
    fontSize: 14,
  },
  photoPreview: {
    marginTop: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 18,
    marginBottom: 8,
  },
  removePhotoText: {
    color: '#b34e4e',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#1d4f39',
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1d4f39',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 40,
    backgroundColor: '#e9f1ec',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c6dbd0',
  },
  actionButtonText: {
    color: '#1d4f39',
    fontWeight: '600',
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: '#f9e8e8',
    borderColor: '#f0d2d2',
  },
  dangerButtonText: {
    color: '#a13d3d',
  },
  obsCard: {
    backgroundColor: '#fafffd',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2a7a55',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  obsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  obsName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0e2e1f',
  },
  obsDate: {
    fontSize: 12,
    color: '#4d6e5d',
  },
  obsMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  obsMetaText: {
    fontSize: 13,
    color: '#4d6e5d',
  },
  obsTag: {
    backgroundColor: '#ecf5f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 40,
    fontSize: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  obsImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginTop: 8,
  },
  deleteButton: {
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#8f5a5a',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6c8a79',
    fontSize: 16,
  },
  footer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#d2e2d8',
    alignItems: 'center',
  },
  footerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3e2f',
    marginBottom: 4,
  },
  footerContact: {
    fontSize: 14,
    color: '#2f5542',
    marginTop: 2,
  },
  footerNote: {
    fontSize: 12,
    color: '#6f8a7b',
    marginTop: 8,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 40,
    backgroundColor: '#e9f1ec',
    borderWidth: 1,
    borderColor: '#c6dbd0',
    justifyContent: 'center',
  },
});

export default App;
