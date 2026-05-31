# bluegreen-blog — a tiny markdown blog in Sinatra.
#
# It exists to demonstrate the bluegreen + promote workflow against a REAL,
# stateful app, plus theme selection via a server-validated `select` param
# (BUILD_FLAVOR) instead of a raw env var. Posts live in SQLite under
# DATA_DIR, which sits OUTSIDE the rsync zone, so content survives every
# redeploy and every bluegreen cut-over.

require "sinatra"
require "kramdown"
require "fileutils"
require "json"

PORT   = (ENV["PORT"] || "5100").to_i
DATA   = ENV["DATA_DIR"] || "/home/developer/data"
# Validated `select` param (rig.yaml: classic | aurora). The server rejects
# anything else, so the app can trust this value — no defensive parsing.
FLAVOR = ENV["BUILD_FLAVOR"] || "classic"
# Optional secret (rig.yaml `secrets:`). Sourced from your shell or a `.env`
# file at deploy (`rig deploy --stage production` loads `.env.production`).
# When set, publishing a post requires a matching token; when unset, the blog
# is open. Different per stage — the production app and a bluegreen staging
# sibling carry different tokens.
ADMIN = ENV["ADMIN_TOKEN"].to_s

set :server, "webrick"      # pure-Ruby server: no native build at deploy time
set :bind, "0.0.0.0"        # MUST bind all interfaces for the Rigbox health probe
set :port, PORT
# Sinatra 4 rejects requests whose Host header isn't in its allow-list (403).
# The Rigbox gateway fronts this app on a per-deploy subdomain and already
# handles host routing + auth, so permit all hosts (empty list = no restriction).
set :host_authorization, { permitted_hosts: [] }
set :views, File.join(__dir__, "views")
set :public_folder, File.join(__dir__, "public")

FileUtils.mkdir_p(DATA)
STORE = File.join(DATA, "posts.json")   # lives under DATA_DIR → survives redeploys

# Tiny pure-Ruby JSON store. No native gems to compile at deploy time, and it
# still proves the point: state under DATA_DIR persists across every redeploy
# and bluegreen cut-over. (For a SQL-backed example see todo-app / url-shortener.)
def load_posts
  return [] unless File.exist?(STORE)
  JSON.parse(File.read(STORE))
rescue JSON::ParserError
  []
end

def save_posts(posts)
  File.write(STORE, JSON.pretty_generate(posts))
end

helpers do
  # Theme accent comes from the validated param. Two flavors so a bluegreen
  # cut-over (or a `rig app param set build_flavor=aurora`) is visible at a glance.
  def accent
    FLAVOR == "aurora" ? "#0EA5A4" : nil   # nil → keep the shared iris default
  end

  def markdown(text)
    Kramdown::Document.new(text.to_s).to_html
  end

  # Publishing is gated only when an ADMIN_TOKEN secret is present.
  def admin_required?
    !ADMIN.empty?
  end
end

get "/healthz" do
  content_type :json
  '{"status":"ok"}'
end

get "/" do
  @posts = load_posts.sort_by { |p| -p["id"] }
  erb :index
end

get "/posts/new" do
  erb :new
end

post "/posts" do
  # Gate writes on the ADMIN_TOKEN secret when one is configured.
  if admin_required? && params[:token].to_s != ADMIN
    halt 403, "admin token required to publish"
  end
  title = params[:title].to_s.strip
  body  = params[:body].to_s
  halt 400, "title required" if title.empty?
  posts = load_posts
  next_id = (posts.map { |p| p["id"] }.max || 0) + 1
  posts << { "id" => next_id, "title" => title, "body" => body,
             "created_at" => Time.now.utc.strftime("%Y-%m-%d %H:%M UTC") }
  save_posts(posts)
  redirect "/"
end

get "/posts/:id" do
  @post = load_posts.find { |p| p["id"].to_s == params[:id] }
  halt 404, "not found" unless @post
  erb :show
end
