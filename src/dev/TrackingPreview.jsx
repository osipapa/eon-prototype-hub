import TrackingLibrary from "@/features/tracking/TrackingLibrary";

export default function TrackingPreview() {
  return (
    <TrackingLibrary
      userEmail="mate@example.com"
      isAdmin
      onOpenDesign={() => {}}
      onOpenPrototypes={() => {}}
      onOpenPrompts={() => {}}
      onOpenAdmin={() => {}}
      onSignOut={() => {}}
    />
  );
}
