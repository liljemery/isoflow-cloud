import React, { createContext, useContext } from 'react';
import type { MergeImportedJsonFn } from 'src/types/isoflowProps';

const IsoflowHostContext = createContext<{
  mergeImportedJson?: MergeImportedJsonFn;
}>({});

export const IsoflowHostProvider = ({
  children,
  mergeImportedJson
}: {
  children: React.ReactNode;
  mergeImportedJson?: MergeImportedJsonFn;
}) => (
  <IsoflowHostContext.Provider value={{ mergeImportedJson }}>
    {children}
  </IsoflowHostContext.Provider>
);

export const useIsoflowHost = () => useContext(IsoflowHostContext);
