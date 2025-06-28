import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import LoginScreen from './screens/auth/LoginScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import ITAdminDashboard from './screens/itadmin/DashboardScreen';
import OpsDashboard from './screens/ops/DashboardScreen';
import LoanOfficerDashboard from './screens/loanofficer/DashboardScreen';
import ClientListScreen from './screens/loanofficer/ClientListScreen';
import ClientProfileScreen from './screens/loanofficer/ClientProfileScreen';
import TotalLoanListScreen from './screens/loanofficer/TotalLoanListScreen';
import PendingLoanDetailScreen from './screens/loanofficer/PendingLoanDetailScreen';
import UserManagementScreen from './screens/itadmin/UserManagementScreen';
import AddEditUserScreen from './screens/itadmin/AddEditUserScreen';
import OpsClientListScreen from './screens/ops/OpsClientListScreen';
import OpsClientProfileScreen from './screens/ops/OpsClientProfileScreen';
import OpsPendingListScreen from './screens/ops/OpsPendingListScreen';
import OpsPendingLoanDetailScreen from './screens/ops/OpsPendingLoanDetailScreen';
import SignatureAgreementScreen from './screens/ops/SignatureAgreementScreen';
import SignedAgreementPreview from './screens/ops/SignedAgreementPreview';
import LoanOfficerNotifications from './screens/loanofficer/LoanOfficerNotifications';
import OpsNotifications from './screens/ops/OpsNotifications';
import LoanHistoryScreen from './screens/shared/LoanHistoryScreen';
import DocumentPreviewScreen from './screens/shared/DocumentPreviewScreen';


// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { UsersProvider } from './contexts/UsersContext';
import { LoanProvider } from './contexts/LoanContext';
import { OpsProvider } from './contexts/OpsContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <UsersProvider>
        <LoanProvider>
          <OpsProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="Dashboard" component={ITAdminDashboard} />
                <Stack.Screen name="OpsDashboard" component={OpsDashboard} />
                <Stack.Screen name="UserManagement" component={UserManagementScreen} />
                <Stack.Screen name="AddEditUser" component={AddEditUserScreen} />
                <Stack.Screen name="LoanOfficerDashboard" component={LoanOfficerDashboard} />
                <Stack.Screen name="ClientList" component={ClientListScreen} />
                <Stack.Screen name="ClientProfile" component={ClientProfileScreen} />
                <Stack.Screen name="TotalLoanList" component={TotalLoanListScreen} />
                <Stack.Screen name="PendingLoanDetail" component={PendingLoanDetailScreen} />
                <Stack.Screen name="OpsClientList" component={OpsClientListScreen} />
                <Stack.Screen name="OpsClientProfile" component={OpsClientProfileScreen} />
                <Stack.Screen name="OpsPendingList" component={OpsPendingListScreen} />
                <Stack.Screen name="OpsPendingLoanDetail" component={OpsPendingLoanDetailScreen} />
                <Stack.Screen name="SignatureAgreement" component={SignatureAgreementScreen} />
                <Stack.Screen name="SignedAgreementPreview" component={SignedAgreementPreview} />
                <Stack.Screen name="LoanOfficerNotifications" component={LoanOfficerNotifications} />
                <Stack.Screen name="OpsNotifications" component={OpsNotifications} />
                <Stack.Screen name="LoanHistory" component={LoanHistoryScreen} />
                <Stack.Screen
                  name="DocumentPreview"
                  component={DocumentPreviewScreen}
                  options={({ route }) => ({
                    headerShown: false,
                  })}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </OpsProvider>
        </LoanProvider>
      </UsersProvider>
    </AuthProvider>
  );
}