import React from 'react';
import ClientList from '../../components/clients/ClientList';

export default function ClientListScreen({ navigation }) {
  return (
    <ClientList
      navigation={navigation}
      userRole="loanofficer"
      dashboardRoute="LoanOfficerDashboard"
    />
  );
}
