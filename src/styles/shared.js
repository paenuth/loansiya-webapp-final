import { Platform } from 'react-native';

export const sharedStyles = {
  container: {
    flexGrow: 1,
    width: '100%',
    backgroundColor: '#f6f6f6',
    padding: Platform.select({ web: 24, default: 16 }),
  },
  containerDesktop: {
    minHeight: '100vh',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  content: {
    flexDirection: 'row',
    padding: Platform.select({ web: 20, default: 16 }),
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
  },
  contentMobile: {
    flexDirection: 'column',
  },
  section: {
    flex: 1,
    padding: Platform.select({ web: 20, default: 16 }),
    backgroundColor: '#fff',
    marginHorizontal: Platform.select({ web: 10, default: 8 }),
    marginVertical: Platform.select({ web: 0, default: 8 }),
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionMobile: {
    padding: 12,
    marginBottom: 20,
    marginHorizontal: 0,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: Platform.select({ web: 16, default: 14 }),
    color: '#666',
  },
  errorText: {
    color: '#dc3545',
    fontSize: Platform.select({ web: 16, default: 14 }),
    marginBottom: 15,
    textAlign: 'center',
  },
  title: {
    fontSize: Platform.select({ web: 22, default: 20 }),
    fontWeight: 'bold',
    color: '#333',
  },
  titleMobile: {
    fontSize: 18,
  },
  button: {
    primaryButton: {
      backgroundColor: '#007bff',
      paddingVertical: Platform.select({ web: 10, default: 8 }),
      paddingHorizontal: Platform.select({ web: 16, default: 12 }),
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButton: {
      backgroundColor: '#e9ecef',
      paddingVertical: Platform.select({ web: 10, default: 8 }),
      paddingHorizontal: Platform.select({ web: 16, default: 12 }),
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: Platform.select({ web: 16, default: 14 }),
      fontWeight: '600',
      textAlign: 'center',
    },
    buttonTextSecondary: {
      color: '#333',
      fontSize: Platform.select({ web: 16, default: 14 }),
      fontWeight: '600',
      textAlign: 'center',
    },
  },
  modal: {
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      backgroundColor: 'white',
      padding: Platform.select({ web: 24, default: 16 }),
      borderRadius: 12,
      width: '80%',
      maxWidth: 500,
      maxHeight: '80%',
    },
    contentMobile: {
      width: '90%',
      padding: 16,
    },
    title: {
      fontSize: Platform.select({ web: 18, default: 16 }),
      fontWeight: 'bold',
      marginBottom: 15,
      textAlign: 'center',
      color: '#333',
    },
  },
  searchBar: {
    container: {
      flexDirection: 'row',
      marginBottom: Platform.select({ web: 16, default: 12 }),
    },
    input: {
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: Platform.select({ web: 12, default: 10 }),
      flex: 1,
      fontSize: Platform.select({ web: 16, default: 14 }),
      borderWidth: 1,
      borderColor: '#ddd',
    },
    inputMobile: {
      padding: 8,
      fontSize: 14,
    },
  },
  header: {
    marginBottom: Platform.select({ web: 24, default: 16 }),
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.select({ web: 20, default: 16 }),
  }
};