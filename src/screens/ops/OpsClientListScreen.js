import React from 'react';
import ClientList from '../../components/clients/ClientList';

export default function OpsClientListScreen({ navigation }) {
  return (
    <ClientList
      navigation={navigation}
      userRole="ops"
      dashboardRoute="OpsDashboard"
    />
  );
}
