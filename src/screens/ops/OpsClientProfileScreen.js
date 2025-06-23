import React from 'react';
import ClientProfile from '../../components/clients/ClientProfile';

export default function OpsClientProfileScreen({ navigation, route }) {
  return (
    <ClientProfile
      navigation={navigation}
      route={route}
      userRole="ops"
    />
  );
}
