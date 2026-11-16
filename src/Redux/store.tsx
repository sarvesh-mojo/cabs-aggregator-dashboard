// src/Redux/store.ts

import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "./slices/authSlice";
import operationReducer from './slices/operationSlice'

const rootReducer = combineReducers({
  authStore: authReducer,
  operationStore: operationReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["authStore","operationStore"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist action types to ignore for serializability check
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// `persistor` to be used with <PersistGate> in your app root
export const persistor = persistStore(store);

// -------------------- Type exports --------------------

// RootState type
export type RootState = ReturnType<typeof rootReducer>;

// AppDispatch type
export type AppDispatch = typeof store.dispatch;
