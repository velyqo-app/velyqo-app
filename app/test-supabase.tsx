import { Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function TestSupabase() {
  const testConnection = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    console.log("DATA:", data);
    console.log("ERROR:", error);
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <TouchableOpacity
        onPress={testConnection}
        style={{
          backgroundColor: "purple",
          padding: 20,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white" }}>Test Supabase</Text>
      </TouchableOpacity>
    </View>
  );
}
