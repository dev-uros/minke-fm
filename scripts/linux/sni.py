"""Minimal StatusNotifierWatcher (what a GNOME/KDE panel provides), plus a
client that reads the tray item's menu and clicks entries by label."""
import sys, time
from gi.repository import Gio, GLib

WATCHER_XML = """<node><interface name="org.kde.StatusNotifierWatcher">
<method name="RegisterStatusNotifierItem"><arg type="s" direction="in"/></method>
<method name="RegisterStatusNotifierHost"><arg type="s" direction="in"/></method>
<property name="RegisteredStatusNotifierItems" type="as" access="read"/>
<property name="IsStatusNotifierHostRegistered" type="b" access="read"/>
<property name="ProtocolVersion" type="i" access="read"/>
<signal name="StatusNotifierItemRegistered"><arg type="s"/></signal>
</interface></node>"""

def watcher():
    bus = Gio.bus_get_sync(Gio.BusType.SESSION)
    items = []
    node = Gio.DBusNodeInfo.new_for_xml(WATCHER_XML)
    def call(conn, sender, path, iface, method, params, inv):
        if method == "RegisterStatusNotifierItem":
            svc = params.unpack()[0]
            if not svc.startswith("/"): pass
            full = sender + (svc if svc.startswith("/") else "")
            items.append(full if svc.startswith("/") else svc)
            open("/tmp/sni-items", "w").write("\n".join(items))
            print("registered", items[-1], flush=True)
        inv.return_value(None)
    def prop(conn, sender, path, iface, name):
        if name == "RegisteredStatusNotifierItems": return GLib.Variant("as", items)
        if name == "IsStatusNotifierHostRegistered": return GLib.Variant("b", True)
        if name == "ProtocolVersion": return GLib.Variant("i", 0)
    bus.register_object("/StatusNotifierWatcher", node.interfaces[0], call, prop, None)
    Gio.bus_own_name_on_connection(bus, "org.kde.StatusNotifierWatcher", 0, None, None)
    Gio.bus_own_name_on_connection(bus, "org.kde.StatusNotifierHost-1", 0, None, None)
    GLib.MainLoop().run()

def item():
    bus = Gio.bus_get_sync(Gio.BusType.SESSION)
    entry = open("/tmp/sni-items").read().split("\n")[-1]
    name, _, path = entry.partition("/")
    path = "/" + path if path else "/StatusNotifierItem"
    p = Gio.DBusProxy.new_sync(bus, 0, None, name, path, "org.kde.StatusNotifierItem", None)
    menu = p.get_cached_property("Menu").unpack()
    return bus, name, path, p, menu

def layout():
    bus, name, _, _, menu = item()
    r = bus.call_sync(name, menu, "com.canonical.dbusmenu", "GetLayout",
                      GLib.Variant("(iias)", (0, -1, [])), None, 0, -1, None).unpack()
    out = []
    for child in r[1][2]:
        cid, props, _ = child
        out.append((cid, props.get("label", "---"), props.get("enabled", True)))
    return out

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "watch": watcher()
    elif cmd == "info":
        _, name, path, p, menu = item()
        for k in ("Id", "Title", "Status", "IconName", "IconThemePath"):
            v = p.get_cached_property(k); print(k, "=", v.unpack() if v else None)
        pix = p.get_cached_property("IconPixmap")
        print("IconPixmap sizes", [(w, h) for w, h, _ in pix.unpack()] if pix else None)
        for row in layout(): print(row)
    elif cmd == "click":
        bus, name, _, _, menu = item()
        target = sys.argv[2]
        for cid, label, _ in layout():
            if label.startswith(target):
                bus.call_sync(name, menu, "com.canonical.dbusmenu", "Event",
                    GLib.Variant("(isvu)", (cid, "clicked", GLib.Variant("i", 0), int(time.time()))),
                    None, 0, -1, None)
                print("clicked", label); break
        else: print("no item", target); sys.exit(1)
