export interface AppState {
  apiKey: string;
}

export const initialState: AppState = {
  apiKey: "",
};

type AppAction = { type: "set-api-key"; payload: { apiKey: string } };

export type AppDispatch = {
  dispatch: React.Dispatch<AppAction>;
};

export const reducer: React.Reducer<AppState, AppAction> = (state, action) => {
  switch (action.type) {
    case "set-api-key":
      return {
        apiKey: action.payload.apiKey,
      };
    default:
      return state;
  }
};
