import React from 'react';
import ClientProfile from '../../components/clients/ClientProfile';

export default function ClientProfileScreen({ navigation, route }) {
  return (
    <ClientProfile
      navigation={navigation}
      route={route}
      userRole="loanofficer"
    />
  );
}
