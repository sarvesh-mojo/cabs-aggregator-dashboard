import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LoginPayload {
  jwtToken: string;
  partner: any[];
  type: string;
  data: any[];
  user_rights: string;
  cabPartner? : string;
  username?: string;
}

interface AuthState {
  is_login: boolean;
  login_JWT: string;
  login_partners: any[];
  login_type: string;
  partner_wise_data: any[];
  user_rights: string;
  logsPartner : string ;
  login_username: string;
}

const initialState: AuthState = {
  is_login: false,
  login_JWT: "",
  login_partners: [],
  login_type: "",
  partner_wise_data: [],
  user_rights: "",
  logsPartner : "",
  login_username: "",
};

export const authSlice = createSlice({
  name: "Auth_Slice",
  initialState,
  reducers: {
    saveLoginInfo: (state, action: PayloadAction<LoginPayload>) => {
      state.is_login = true;
      state.login_JWT = action.payload.jwtToken;
      state.login_partners = action.payload.partner;
      state.login_type = action.payload.type;
      // state.partner_wise_data = action.payload.data;
      if(action.payload?.cabPartner && action.payload?.cabPartner !== "null"){
        state.logsPartner = action.payload.cabPartner;
      }

      if (action.payload.username) {
        state.login_username = action.payload.username.trim();
      }

      // Copy data as-is first
      const dataCopy = { ...action.payload.data[0] };


      // If "bac" exists in partners, create 4 sub-entries
      if (action.payload.partner.includes("bac") && dataCopy["bac"]) {
        const bacData = dataCopy["bac"];

        // Add 4 BAC sub-portals with same auth + host, but store domain
        dataCopy["bac_agent"] = { ...bacData, domain: "AGENT" };
        dataCopy["bac_mb"]    = { ...bacData, domain: "BAC" };
        dataCopy["bac_yatra"] = { ...bacData, domain: "YATRA" };
        dataCopy["bac_corp"]  = { ...bacData, domain: "CORP" };
        dataCopy["bac_swiggy"] = { ...bacData, createdBy: "swiggy-ops" };
        dataCopy["bac_agentic_chat_dev"]  = { ...bacData, domain: "AGENTIC_CHAT_DEV" };
        dataCopy["bac_agentic_chat"]  = { ...bacData, domain: "AGENTIC_CHAT" };
      }

      state.partner_wise_data = [dataCopy];

      // const partners = action.payload.partner.flatMap((p: string) =>
      //   p === "bac" ? ["bac", "bac_agent", "bac_mb", "bac_yatra", "bac_corp"] : [p]
      // );
      // const partners = action.payload.partner;
      // state.login_partners = partners;

      
      // let initiatePartner = action?.payload?.partner[0];
      // state.user_rights = action.payload.data[0]?.[initiatePartner]?.user_rights;

       const initiatePartner = action?.payload?.partner[0];
  state.user_rights = action.payload.data[0]?.[initiatePartner]?.user_rights;
    },

    logoutUser: () => initialState
  }
});

export const { saveLoginInfo, logoutUser } = authSlice.actions;
export default authSlice.reducer;
