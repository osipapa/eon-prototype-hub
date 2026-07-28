import TrackingLibrary from "@/features/tracking/TrackingLibrary";

export default function TrackingPreview() {
  return (
    <TrackingLibrary
      userEmail="mate@example.com"
      isAdmin
      onOpenPrototypes={() => {}}
      onOpenPrompts={() => {}}
      onOpenAdmin={() => {}}
      onSignOut={() => {}}
    />
  );
}
