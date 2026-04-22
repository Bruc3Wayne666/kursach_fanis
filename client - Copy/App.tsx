import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { checkAuth } from './src/utils/authLoader';

function AppContent() {
    const dispatch = useDispatch();

    useEffect(() => {
        checkAuth(dispatch);
    }, [dispatch]);

    return (
        <NavigationContainer>
            <AppNavigator />
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <SafeAreaProvider>
            <Provider store={store}>
                <AppContent />
            </Provider>
        </SafeAreaProvider>
    );
}
